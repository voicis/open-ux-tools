// Last content update: Sat Jun 14 2025 13:41:16 GMT+0200 (Mitteleuropäische Sommerzeit)
import type { CSDL } from '@sap-ux/vocabularies/CSDL';

export default {
    '$Version': '4.0',
    '$Reference': {
        'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
            '$Include': [
                {
                    '$Namespace': 'Org.OData.Core.V1',
                    '$Alias': 'Core'
                }
            ]
        },
        'https://sap.github.io/odata-vocabularies/vocabularies/Common.json': {
            '$Include': [
                {
                    '$Namespace': 'com.sap.vocabularies.Common.v1',
                    '$Alias': 'Common'
                }
            ]
        }
    },
    'com.sap.vocabularies.Session.v1': {
        '$Alias': 'Session',
        '@Org.OData.Core.V1.Description': 'Terms for services supporting sticky sessions for data modification',
        '@Org.OData.Core.V1.Description#Published': '2018-07-26 © Copyright 2018 SAP SE. All rights reserved',
        '@Org.OData.Core.V1.Links': [
            {
                'rel': 'alternate',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Session.xml'
            },
            {
                'rel': 'latest-version',
                'href': 'https://sap.github.io/odata-vocabularies/vocabularies/Session.json'
            },
            {
                'rel': 'describedby',
                'href': 'https://github.com/sap/odata-vocabularies/blob/main/vocabularies/Session.md'
            }
        ],
        '@Org.OData.Core.V1.LongDescription':
            '\nBuilding REST APIs on top of ABAP code that has been written for classic session-based communication is hard and sometimes not economically feasible.\n\nHTTP is not connection-based, meaning that each request may be sent over a different TCP connection. \nAdding scalable servers and load balancers into the mix, each individual HTTP request is typically answered by a different application server instance.\n\nSticky sessions to the rescue: session stickiness or session affinity is a mechanism to route (HTTP) calls from the same client instance to the same "session", \n"work process", or "application instance".  This is a performance improvement measure because it allows the server to keep server state in process-specific memory.\nThis process-specific memory is lost if the server process instance crashes, in which case the client is redirected to another process instance.\nIn modern, scalable server environments sticky sessions are usually combined with a persistency service to allow recovering session state after \na process instance crash, so from the client\'s perspective the server state is kept. In the case of ABAP servers the session state is simply lost.\n\nSession stickiness is usually achieved via a cookie containing the session id. This has the benefit that browser-based applications don\'t need to be aware \nof the session stickiness because browsers automatically send cookies on subsequent requests. \nHowever, cookies are shared across browser tabs and windows, and requests from different tabs or windows would be dispatched to the same server session.\nAgain this poses a problem for classic ABAP code which was built under the assumption that each server session is tied to at most one client instance.\n\nThis means that the client application has to be aware of the service\'s limitations and cooperate to route calls from each client application instance (browser tab or window) \nto a different server session. The ABAP server allows this by sending the session id in the response header `sap-contextid`, \nwhich client application instances will need to echo as a request header in subsequent requests.\n\nAlso the client needs to adhere to a strict choreography of \n- initiate session\n- send data modification and read requests\n- end session by either\n  - confirm data modification or\n  - discard changes\n\nThis choreography is (intentionally) similar to the choreography for [Draft Handling](https://experience.sap.com/fiori-design-web/draft-handling/).\n\nData modification requests outside of a session are allowed and have their usual OData semantics.\nThis allows e.g. using the same service for a list report with actions and for an editable object page, \ncombined as one UI app.\n        ',
        'StickySessionSupported': {
            '$Kind': 'Term',
            '$Type': 'com.sap.vocabularies.Session.v1.StickySessionSupportedType',
            '$AppliesTo': ['EntitySet'],
            '@Org.OData.Core.V1.Description':
                'The annotated entity set allows data modification only within a sticky session',
            '@Org.OData.Core.V1.Example': {
                '@com.sap.vocabularies.Session.v1.SessionOnlyStateSupported': {
                    'NewAction': '...',
                    'EditAction': '...',
                    'SaveAction': '...',
                    'DiscardAction': '...'
                }
            }
        },
        'StickySessionSupportedType': {
            '$Kind': 'ComplexType',
            '@Org.OData.Core.V1.Description': 'Actions for managing data modification within a sticky session',
            'NewAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@Org.OData.Core.V1.Description':
                    'Bound action that initiates a sticky session for creating new entities in the targeted entity set or collection',
                '@Org.OData.Core.V1.LongDescription':
                    'Signature:\n- Binding parameter is collection of type of annotated entity set\n- No non-binding parameters\n- No return type \n\nIf called within a sticky session the sticky session continues. \n\nOtherwise:\n- On success this action initiates a sticky session.\n- On failure no sticky session is initiated.'
            },
            'AdditionalNewActions': {
                '$Collection': true,
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@com.sap.vocabularies.Common.v1.Experimental': true,
                '@Org.OData.Core.V1.Description': 'Additional bound actions that initiate a sticky session',
                '@Org.OData.Core.V1.LongDescription':
                    'Actions have the same binding parameter as the `NewAction` and may have non-binding paramters'
            },
            'EditAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@Org.OData.Core.V1.Description':
                    'Bound action that initiates a sticky session for editing the targeted entity',
                '@Org.OData.Core.V1.LongDescription':
                    'Signature:\n- Binding parameter is type of annotated entity set\n- No non-binding parameters\n- Return type is same as binding parameter type \n\nIf called within a sticky session the sticky session continues. \n\nOtherwise:\n- On success this action returns the targeted entity and initiates a sticky session.\n- On failure no sticky session is initiated.'
            },
            'SaveAction': {
                '$Type': 'com.sap.vocabularies.Common.v1.QualifiedName',
                '@Org.OData.Core.V1.Description': 'Bound action that saves a new or edited entity',
                '@Org.OData.Core.V1.LongDescription':
                    'Signature:\n- Binding parameter is type of annotated entity set\n- No non-binding parameters\n- Return type is same as binding parameter type \n\nOn success this action returns the newly created or edited entity. The sticky session is terminated after all entities that were newly created or edited in it have been saved. \n\nOn failure the sticky session is kept alive.'
            },
            'DiscardAction': {
                '$Type': 'Org.OData.Core.V1.SimpleIdentifier',
                '@Org.OData.Core.V1.Description':
                    'Action import for an unbound action that discards all changes and terminates the sticky session',
                '@Org.OData.Core.V1.LongDescription':
                    'Signature:\n- No parameters\n- No return type \n\nIf called within a sticky session the sticky session is terminated, irrespective of whether the action succeeds or fails. \n\nIf called outside of a sticky session the action fails and does not initiate a session.'
            }
        }
    }
} as CSDL;
